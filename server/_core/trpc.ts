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

const requirePresidentialRole = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user || !["national_president", "presidential_council"].includes(ctx.user.docRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Presidential Command Brief access requires an authorised presidential role." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const presidentialProcedure = t.procedure.use(requireAuthorisedOfficer).use(requirePresidentialRole);

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
