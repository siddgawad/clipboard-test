import { Global, Module } from "@nestjs/common";

import { PrismaService } from "./prisma.service";

@Global() // this is a flag(marker or indicator). we make our module global so it is available everywhere without import
@Module({ // module is a flexible container which defines module (peices of code stuck together)
  providers: [PrismaService], // we define providers as this is where the PrismaClient connection to DB logic stays 
  exports: [PrismaService], // this says which things this module is sharing with other modules 
  //it is sharing PrismaService
})
export class PrismaModule {}
