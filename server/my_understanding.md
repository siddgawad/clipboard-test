So when I analysed the schema.prisma -  I understoodb how 3 tables have been defined (Worker, Workplace and shift). 

Worker and workplace can have many shift records, shift has a required WorkplaceId linking shift to a workplace, and workerId is optional suggesting shift can exist without worker assigned to it, makes sense. 


prisma.service.ts - connects PrismaClient to the database '

prisma.module - defines module using exports and provider, and makes it global so PrismaService (i.e PrismaClient connected to DB) is available throughout the app without import statements, and we export this as PrismaModule. So we can input PrismaModule thorughout the app and from within it use PrismaServices wherever needed. So we do not need to import PrismaModule. 


so shared utils files - pagination defines functions  which we use in controllers - refer pagination to check..make not of function made and in which controller it goes, to deepen understanding.
under shared.types - service returns paginatedData, controller returns PaginatedResponse, and Page interface is used basically everywhere.


controller performs crud ops using functions from shared utils

so there are 3 domains- workers, workplaces, and shifts and each has it's own module 

so @module 
controllers- xController
providers: xProvider
export xModule{}

this is the common pattern in all modules i.e workers.module,workplace.module and shifts.module - this tells NestJs i have x controller and x service, u can use me (module) to inject them 


controllers extract inputs via decorators, validate input via pipe, call services and return shaped responses

so lets say we have: GET/shifts?workerId=42&jobType=x&location=Y&page=1&shard=0 

controller here uses ZodValidationPipe to validate the query, then page = getPage(1,0)=>{num:1,size:10,shard:10}, it filters JobType, location and workerId, and omitSgard returns the object without internal shard field 

hmm so lets focus on services- 
same we created injectable class and assigned prsimaService so all DB reads/writes willl flow through...

okay create uses Zod passed object, writes a row to shift the table, crerates data as Shift...

okay, i believe this is similar pattern across all domains, it handles logic part by writing functions. 

lets start the scripts

declare module and import prismamodule,workermodule,shiftsmodule and workplacemodule since we will use this, also need dependencies from prisma.client like shifts,worker, workpalces....getPage,page from pagination, oage from sghared types....shifts modules and services? same for contrreoller....


so bootstrap mpodules...CREATE di container, get services, page start, fetch using paging, map active workers, count completed shifts per active worker, filter top 3, output 

hmhmhmhm oaky





