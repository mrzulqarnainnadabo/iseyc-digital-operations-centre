import { officerProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getDay1Packet,
  getDepartmentDesk,
  getGlobalApprovalQueue,
  getOrgStructure,
  listDepartments,
  listSeats,
} from "./service";

export const institutionalRouter = router({
  orgStructure: officerProcedure.query(() => getOrgStructure()),
  departments: officerProcedure.query(() => listDepartments()),
  seats: officerProcedure.query(() => listSeats()),
  departmentDesk: officerProcedure
    .input(
      z.object({
        departmentKey: z.enum([
          "education_capacity_building",
          "health_wellbeing",
          "digital_systems_technology",
          "civic_affairs",
        ]),
      }),
    )
    .query(({ input }) => getDepartmentDesk(input.departmentKey)),
  approvalQueue: officerProcedure
    .input(z.object({ isTestMode: z.boolean().default(false) }))
    .query(({ input }) => getGlobalApprovalQueue({ isTestMode: input.isTestMode })),
  day1Packet: officerProcedure
    .input(z.object({ seatKey: z.string().min(2).max(120) }))
    .query(({ input }) => getDay1Packet(input.seatKey)),
});
