// LEGACY — Manus Forge cron-callback verification only.
//
// As of Phase 2, regular user sign-in is handled entirely by Supabase Auth
// (see server/_core/supabaseAuth.ts). This file now exists solely to verify
// the Meeting & Decision Tracker's scheduled fallback callback
// (POST /api/scheduled/meeting-fallback), which is still triggered by
// Manus's Forge heartbeat scheduler (server/_core/heartbeat.ts).
//
// This whole file is scoped for removal in Phase 6, when the scheduled
// fallback job moves to Vercel Cron. Until then, do not remove it — the
// Meeting & Decision Tracker's human-approval safeguard depends on this
// callback continuing to authenticate correctly.
import { AXIOS_TIMEOUT_MS, COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { jwtVerify } from "jose";
import { ENV } from "./env";
import type { GetUserInfoWithJwtRequest, GetUserInfoWithJwtResponse } from "./types/manusTypes";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
const CRON_OPEN_ID_PREFIX = "cron_";

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class CronCallbackVerifier {
  private readonly client: AxiosInstance;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  private async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string } | null> {
    if (!cookieValue) return null;
    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), {
        algorithms: ["HS256"],
      });
      const { openId } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId)) return null;
      return { openId };
    } catch (error) {
      console.warn("[CronAuth] Session verification failed", String(error));
      return null;
    }
  }

  private async getUserInfoWithJwt(jwtToken: string): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = { jwtToken, projectId: ENV.appId };
    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    return data;
  }

  async authenticateCronRequest(req: Request): Promise<AuthenticatedCronUser> {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    const session = await this.verifySession(sessionToken);
    if (!session || !session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      throw ForbiddenError("Invalid or non-cron session");
    }

    const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
    const taskUid = userInfo.taskUid ?? null;
    if (!taskUid) {
      throw ForbiddenError("Cron session missing task_uid");
    }

    return {
      isCron: true,
      taskUid,
      name: userInfo.name || "Scheduled Task",
    };
  }
}

export type AuthenticatedCronUser = {
  isCron: true;
  taskUid: string;
  name: string;
};

export const cronAuth = new CronCallbackVerifier();
