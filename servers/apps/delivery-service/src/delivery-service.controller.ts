import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DeliveryServiceService } from './delivery-service.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CompleteDeliveryProfileDto } from './dto/complete-profile.dto';

const multerOptions = {
  storage: diskStorage({
    destination: './uploads/delivery',
    filename: (_req: any, file: Express.Multer.File, cb: (err: any, name: string) => void) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${file.fieldname}-${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req: any, file: Express.Multer.File, cb: (err: any, accept: boolean) => void) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new BadRequestException('Only image files are allowed'), false);
    }
    cb(null, true);
  },
};

@Controller()
export class DeliveryServiceController {
  constructor(private readonly service: DeliveryServiceService) {}

  // ─── NATS events ──────────────────────────────────────────────────────────────

  @EventPattern('user.delivery.created')
  handleDeliveryCreated(
    @Payload()
    data: {
      userId: string;
      firstName: string;
      lastName: string;
      fullName: string;
      dateOfBirth: string;
      phone: string;
      agentType: string;
      address: string | null;
    },
  ) {
    return this.service.createAgent(data);
  }

  @EventPattern('delivery.agent.approved')
  handleAgentApproved(@Payload() data: { userId: string }) {
    return this.service.approveAgent(data);
  }

  // ─── HTTP: Profile step 2 ─────────────────────────────────────────────────────

  /**
   * GET /api/delivery/profile/questions
   * Public — returns 2 random questions for the application form.
   */
  @Get('profile/questions')
  getQuestions() {
    return { data: this.service.getQuestions() };
  }

  /**
   * POST /api/delivery/profile/complete
   * Auth: Bearer token (delivery role)
   * Multipart/form-data:
   *   profilePicture  — image file
   *   idPicture       — image file
   *   answers         — JSON string: [{ question, answer }, { question, answer }]
   */
  @Post('profile/complete')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profilePicture', maxCount: 1 },
        { name: 'idPicture', maxCount: 1 },
      ],
      multerOptions,
    ),
  )
  async completeProfile(
    @CurrentUser('sub') userId: string,
    @Body('answers') answersRaw: string,
    @UploadedFiles()
    files: {
      profilePicture?: Express.Multer.File[];
      idPicture?: Express.Multer.File[];
    },
  ) {
    let answers: CompleteDeliveryProfileDto['answers'];
    try {
      answers = JSON.parse(answersRaw);
    } catch {
      throw new BadRequestException('answers must be a valid JSON array');
    }
    return this.service.completeProfile(userId, answers, files);
  }

  /**
   * GET /api/delivery/manager/applications
   * Auth: Bearer token (manager role)
   * Returns all submitted freelancer applications awaiting decision.
   */
  @Get('manager/applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  getPendingApplications() {
    return this.service.getPendingApplications();
  }
}
