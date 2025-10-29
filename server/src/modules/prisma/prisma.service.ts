import { Injectable, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
//  PrismaClient is a type-safe query builder, provides clean and 
//intutive API for performing CRUD ops like filtering, sorting, etc. without raw SQL


@Injectable()
// this is a decorator 
export class PrismaService extends PrismaClient implements OnModuleInit {
  /* so when PrismaClient is loaded into PrismaService, lifecycle method
  OnModuleInit is called - this being a lifecycle hook when PrismaService gets
  intialised, it returns a Promise within which we connect PrismaClient to the database
  */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
