import { IsEnum } from "class-validator";
import { AgentStatus } from "../entities/delivery-agent.entity";

export class AdminChangeAgentStatusDto {
  @IsEnum(AgentStatus, { message: "حالة المندوب غير مدعومة." })
  status: AgentStatus;
}
