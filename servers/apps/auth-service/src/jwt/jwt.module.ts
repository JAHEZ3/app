import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppJwtService } from './jwt.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [AppJwtService],
  exports: [AppJwtService],
})
export class AppJwtModule {}
