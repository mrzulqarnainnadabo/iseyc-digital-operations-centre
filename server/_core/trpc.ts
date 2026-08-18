import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const requireAuthorisedOfficer = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user || !ctx.user.isAuthorizedOfficer) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Authorised ISEYC officer access is required." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const officerProcedure = t.procedure.use(requireAuthorisedOfficer);

const requireNationalPresident = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user || ctx.user.docRole !== "national_president") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Full Presidential Command access is reserved for the National President." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const nationalPresidentProcedure = t.procedure.use(requireAuthorisedOfficer).use(requireNationalPresident);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const officerAdminProcedure = t.procedure.use(requireAuthorisedOfficer).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
