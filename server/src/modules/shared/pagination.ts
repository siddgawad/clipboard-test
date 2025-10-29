import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

import { MAX_SHARDS } from "./constants";
import { Page } from "./shared.types";

interface CountableCollection {
  count(parameters: { skip: number; take: number; where: any }): Promise<number>;
}
/*
We define a method called count within it is an argument called 
parameters and it has an object with 3 keys - skip, take and where, this method
ultimately returns a Promise of type number. so when we use this type, we 
//can use count method to check how many items exist defined by skip,take and where

*/


const FIRST_PAGE = 1;
const PAGE_SIZE = 10;
const PAGE_QUERY_PARAM = "page";
const SHARD_QUERY_PARAM = "shard";
const DEFAULT_SHARD = 0;

function parseOptionalInt(value?: string): number | undefined {
  return value ? parseInt(value, 10) : undefined;
}

function urlWithoutQueryParameters(request: Request): string {
  const protocolAndHost = `${request.protocol}://${request.get("Host")}`;
  const pathname = new URL(`${protocolAndHost}${request.originalUrl}`).pathname;
  return `${protocolAndHost}${pathname}`;
} // returns clean url without query params 

export function getPage(pageNum?: number, shard?: number): Page {
  return { 
    num: pageNum ? pageNum : FIRST_PAGE, 
    size: PAGE_SIZE, 
    shard: shard !== undefined ? shard : DEFAULT_SHARD 
  };
} // we use this function to build an object with keys num, size and shard from query


export function nextLink(parameters: { nextPage?: Page; request: Request }): string | undefined {
  const { nextPage, request } = parameters; 
  if (nextPage) {
    const url = new URL(`${request.protocol}://${request.get("Host")}${request.originalUrl}`);
    const searchParams = new URLSearchParams(url.search); // reads query params
    searchParams.set(PAGE_QUERY_PARAM, nextPage.num.toString());
    if (nextPage.shard !== undefined) {
      searchParams.set(SHARD_QUERY_PARAM, nextPage.shard.toString());
    }

    return `${urlWithoutQueryParameters(request)}?${searchParams.toString()}`;
  }
}    //updates page and shard for next page. builds final next page URL 



export function queryParameters(parameters: { page: Page; whereFilter?: any }): {
  skip: number;
  take: number;
  where: any;
} {
  const { page, whereFilter } = parameters;
  return {
    take: page.size,
    skip: (page.num-1) * page.size, // this ensures we start at first row and 
    //do not skip page 1 
    where: {
      shard: page.shard ?? DEFAULT_SHARD,
      ...(whereFilter ? whereFilter : {}),
    },
  };
}

async function countOnPage(
  page: Page,
  collection: CountableCollection,
  whereFilter?: any,
): Promise<number> {
  return collection.count(queryParameters({ page, whereFilter }));
} /*so this takes parameterslike page, collection, and whereFilter; and promises to return something of type number */

export async function getNextPage(parameters: {
  currentPage: Page;
  collection: CountableCollection;
  whereFilter?: any;
}): Promise<Page | undefined> {
  const { currentPage, collection, whereFilter } = parameters;
  const nextPageNum = currentPage.num + 1;
  const nextPageInShard = getPage(nextPageNum, currentPage.shard);

  const countRemainingInShard = await countOnPage(nextPageInShard, collection, whereFilter);

  if (countRemainingInShard > 0) {
    return nextPageInShard;
  }

  const nextShard = (currentPage.shard ?? DEFAULT_SHARD) + 1;

  if (nextShard > MAX_SHARDS) {
    return undefined;
  }

  const pageInNextShard = getPage(FIRST_PAGE, nextShard);

  const countInNextShard = await countOnPage(pageInNextShard, collection, whereFilter);

  if (countInNextShard > 0) {
    return pageInNextShard;
  }

  return undefined;
}

export function omitShard<T extends { shard: number }>(obj: T): Omit<T, "shard"> {
  const { shard: _, ...rest } = obj;
  return rest;
}

// NestJS Decorator
export const PaginationPage = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const page = parseOptionalInt(request.query[PAGE_QUERY_PARAM]);
  const shard = parseOptionalInt(request.query[SHARD_QUERY_PARAM]);

  return getPage(page, shard);
});
