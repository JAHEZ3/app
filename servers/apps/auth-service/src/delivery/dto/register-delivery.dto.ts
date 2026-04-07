import { IsString, IsNotEmpty, IsPhoneNumber, IsEnum } from 'class-validator';

export enum TransportType {
  MOTORCYCLE = 'motorcycle',
  CAR = 'car',
  BICYCLE = 'bicycle',
  FOOT = 'foot',
}

export class RegisterDeliveryDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsPhoneNumber()
  phone: string;

  /** Base64-encoded ID picture or a URL to an uploaded image */
  @IsString()
  @IsNotEmpty()
  idPic: string;

  @IsEnum(TransportType)
  transport: TransportType;
}
