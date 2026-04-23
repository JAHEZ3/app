import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { AgentStatus, VehicleType } from "../entities/delivery-agent.entity";

export class AdminListAgentsDto {
  @IsOptional()
  @IsEnum(AgentStatus, { message: "حالة المندوب غير مدعومة." })
  status?: AgentStatus;

  @IsOptional()
  @IsEnum(VehicleType, { message: "نوع المركبة غير مدعوم." })
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page يجب أن يكون رقماً صحيحاً." })
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "limit يجب أن يكون رقماً صحيحاً." })
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
