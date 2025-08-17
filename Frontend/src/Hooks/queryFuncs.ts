import { ResponseScheme } from "../Schema/schema";
import type { PostRequestResult } from "../type/type";
import { z } from "zod";

export async function PostRequest(
  url: string,
  data: any,
  schema?: z.Schema,
  formData?: boolean,
): Promise<PostRequestResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: formData
        ? undefined // Let the browser set `Content-Type` with proper boundary
        : { "Content-Type": "application/json" },
      credentials: "include",
      body: formData ? data : JSON.stringify(data),
    });

    // Try-catch JSON parsing to handle non-JSON responses
    let json: any;
    try {
      json = await response.json();
    } catch {
      throw new Error("無法解析伺服器回應/網路錯誤");
    }

    // Zod validation
    const result = ResponseScheme.safeParse(json);
    if (!result.success) {
      throw Error("資料格式錯誤 fail to parse response schema");
    }

    // validate return data shape, if response succeeds and has data
    if (
      schema &&
      result.data.type === "Success" &&
      result.data.payload.data !== null
    ) {
      const dataResult = schema.safeParse(result.data.payload.data);
      if (result.data.type !== "Success") return result.data;
      if (!dataResult.success) {
        throw Error("資料格式錯誤 fail to parse data schema");
      }
    }

    return result.data;
  } catch (error: unknown) {
    // Network error: fetch throws TypeError
    if (error instanceof TypeError) {
      return {
        type: "Error",
        payload: { field: "root", message: "請檢查您的網路連線" },
      };
    }

    // Expected Error object
    if (error instanceof Error) {
      if (error.message === "伺服器錯誤") {
        throw new Error("伺服器錯誤"); // bubble up this error to make react query force retry
      }

      return {
        type: "Error",
        payload: { field: "root", message: error.message || "未知錯誤" },
      };
    }

    // Fallback for non-standard errors
    return {
      type: "Error",
      payload: { field: "root", message: "發生未知錯誤" },
    };
  }
}

export async function GetRequest(
  url: string,
  data?: any,
  schema?: z.Schema,
): Promise<PostRequestResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    // Try-catch JSON parsing to handle non-JSON responses
    let json: any;
    try {
      json = await response.json();
    } catch {
      throw new Error("無法解析伺服器回應/網路錯誤");
    }

    // Zod validation
    const result = ResponseScheme.safeParse(json);
    if (!result.success) {
      throw Error("資料格式錯誤 fail to parse response schema");
    }
    // validate return data shape
    if (schema) {
      const dataResult = schema.safeParse(result.data.payload.data);
      if (result.data.type !== "Success") return result.data;
      if (!dataResult.success) {
        throw Error("資料格式錯誤 fail to parse data schema");
      }
    }

    return result.data;
  } catch (error: unknown) {
    // Network error: fetch throws TypeError
    if (error instanceof TypeError) {
      return {
        type: "Error",
        payload: { field: "root", message: "請檢查您的網路連線", data: 502 }, // bad gateway
      };
    }

    // Expected Error object
    if (error instanceof Error) {
      if (error.message === "伺服器錯誤") {
        throw new Error("伺服器錯誤"); // bubble up this error to make react query force retry
      }

      return {
        type: "Error",
        payload: {
          field: "root",
          message: error.message || "未知錯誤",
          data: 502,
        },
      };
    }

    // Fallback for non-standard errors
    return {
      type: "Error",
      payload: { field: "root", message: "發生未知錯誤", data: 502 },
    };
  }
}
