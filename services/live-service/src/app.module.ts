import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { StreamingModule } from './streaming/streaming.module';
import { AuctioneerController } from './auctioneer/auctioneer.controller';
import { AuctioneerService } from './auctioneer/auctioneer.service';
import { ChatGateway } from './chat/chat.gateway';
import { ChatService } from './chat-service/chat.service';
import { AbsenteeService } from './absentee/absentee.service';
import { WebRtcGateway } from './webrtc/webrtc.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    StreamingModule,
  ],
  controllers: [AuctioneerController],
  providers: [
    AuctioneerService,
    ChatGateway,
    ChatService,
    AbsenteeService,
    WebRtcGateway,
  ],
})
export class AppModule {}
