import { Injectable } from "@nestjs/common";

@Injectable()
export class AuthServiceService {
  getHello(): string {
    return "Hello World Auth Service is App JHAZE!";
  }
}
