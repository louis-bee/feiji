import { SESSION_KEY } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

/** 把当前操作者身份带给后端，供访问日志使用。 */
export function actorHeader(): Record<string, string> {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    if (value === "her" || value === "him") return { "X-Actor": value };
  } catch {
    // 隐私模式下 sessionStorage 不可用，忽略即可。
  }
  return {};
}

export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...actorHeader(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error("连接暂时中断，请检查网络后重试，你的输入还在。");
  }
  const data = await response.json().catch(() => { });
  if (!response.ok) {
    throw new ApiError(
      data.message || `请求失败 (${response.status})`,
      response.status,
    );
  }
  return data as T;
}

export function uploadFile(
  file: File,
  albumId: string | null,
  date: string,
  onProgress: (progress: number) => void,
  signal: AbortSignal,
): Promise<import("../shared/types").Media> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const absort = () => xhr.abort();
    const clean = () => signal.removeEventListener('abort', absort);
    if (signal.aborted) {
      reject(new Error('已取消上传'));
      return;
    }
    signal.addEventListener('abort', absort, { once: true });
    xhr.open("POST", "/api/uploads");
    for (const [name, value] of Object.entries(actorHeader()))
      xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      clean();
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('上传响应异常，请重试'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.message || `上传失败 (${xhr.status})`));
    };
    xhr.onerror = () => {
      clean();
      reject(new Error('网络中断，点击重试即可重新上传'));
    };
    xhr.onabort = () => {
      clean();
      reject(new Error('已取消上传，可点击重试'));
    };
    const form = new FormData();
    if (albumId) form.append('albumId', albumId);
    if (date) form.append('date', date);
    form.append('file', file);
    xhr.send(form);
  });
}