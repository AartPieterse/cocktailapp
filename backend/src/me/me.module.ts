import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { UserData, UserDataSchema } from './schemas/user-data.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserData.name, schema: UserDataSchema },
    ]),
    AuthModule, // provides JwtAuthGuard (+ JwtService) and AuthService
    UsersModule,
  ],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
