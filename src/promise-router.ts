import {
  Router,
  Request,
  Response,
  NextFunction,
  RouterOptions,
  RequestParamHandler,
  RequestHandler,
  ErrorRequestHandler
} from "express";
import { IRoute, PathParams } from "express-serve-static-core";
// @ts-ignore
import * as flatten from "array-flatten";

type RouteMethod =
  | "all"
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head"
  | "checkout"
  | "copy"
  | "lock"
  | "merge"
  | "mkactivity"
  | "mkcol"
  | "move"
  | "m-search"
  | "notify"
  | "purge"
  | "report"
  | "search"
  | "subscribe"
  | "trace"
  | "unlock"
  | "unsubscribe";

type RouterMethod =
  | RouteMethod
  | "use"
  | "connect"
  | "propfind"
  | "proppatch"
  | "param";

interface RequestHandlerArity2 {
  (req: Request, res: Response): any;
}
interface RequestHandlerArity3 {
  (req: Request, res: Response, next: NextFunction): any;
}
interface RequestHandlerArity4 {
  (err: any, req: Request, res: Response, next: NextFunction): any;
}

interface PromiseRequestHandler {
  (req: Request, res: Response): any;
  (req: Request, res: Response, next: NextFunction): any;
  (err: any, req: Request, res: Response, next: NextFunction): any;
}

const ROUTE_METHODS: Array<RouteMethod> = [
  "all",
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
  "checkout",
  "copy",
  "lock",
  "merge",
  "mkactivity",
  "mkcol",
  "move",
  "m-search",
  "notify",
  "purge",
  "report",
  "search",
  "subscribe",
  "trace",
  "unlock",
  "unsubscribe"
];

const ROUTER_METHODS: Array<RouterMethod> = [
  "use",
  "all",
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
  "checkout",
  "connect",
  "copy",
  "lock",
  "merge",
  "mkactivity",
  "mkcol",
  "move",
  "m-search",
  "notify",
  "propfind",
  "proppatch",
  "purge",
  "report",
  "search",
  "subscribe",
  "trace",
  "unlock",
  "unsubscribe"
];

const isPromise = (val: any) =>
  typeof val === "object" && val !== null && typeof val.catch === "function";

const wrappedArity2 = (
  middleware: RequestHandlerArity2,
  bindNext?: Function
): RequestHandler => (req, res, next) => {
  if (typeof bindNext === "function") {
    next = bindNext(next);
  }
  const val = middleware(req, res);
  if (isPromise(val)) {
    val.catch(next);
  }
};

const wrappedArity3 = (
  middleware: RequestHandlerArity3,
  bindNext?: Function
): RequestHandler => (req, res, next) => {
  if (typeof bindNext === "function") {
    next = bindNext(next);
  }
  const val = middleware(req, res, next);
  if (isPromise(val)) {
    val.catch(next);
  }
};

const wrappedArity4 = (
  middleware: RequestHandlerArity4,
  bindNext?: Function
): ErrorRequestHandler => (err, req, res, next) => {
  if (typeof bindNext === "function") {
    next = bindNext(next);
  }
  const val = middleware(err, req, res, next);
  if (isPromise(val)) {
    val.catch(next);
  }
};

const wrapParam = (
  middleware: RequestParamHandler,
  bindNext?: Function
): RequestParamHandler => (req, res, next, value, name) => {
  if (typeof bindNext === "function") {
    next = bindNext(next);
  }
  const val = middleware(req, res, next, value, name);
  if (isPromise(val)) {
    val.catch(next);
  }
};

function wrapMiddleware(
  middleware: PromiseRequestHandler,
  bindNext?: Function
) {
  switch (middleware.length) {
    case 3:
      return wrappedArity3(middleware as RequestHandlerArity3, bindNext);
    case 4:
      return wrappedArity4(middleware as RequestHandlerArity4, bindNext);
  }
  return wrappedArity2(middleware as RequestHandlerArity2, bindNext);
}

function bindRouteMethods(rtr: IRoute, bindNext?: Function) {
  ROUTE_METHODS.forEach(method => {
    const originalMethod = rtr[method];
    rtr[method] = function wrappedMethod(...args: any[]) {
      return originalMethod.apply(
        this,
        flatten(args).map((arg: any, i: number) => {
          if ((i === 0 && typeof arg === "string") || arg instanceof RegExp) {
            return arg;
          }
          return wrapMiddleware(arg, bindNext);
        })
      );
    };
  });
  return rtr;
}

function bindRouterMethods(rtr: Router, bindNext?: Function) {
  ROUTER_METHODS.forEach(method => {
    const originalMethod = rtr[method];
    rtr[method] = function wrappedMethod(...args: any[]) {
      if (method === "param") {
        return originalMethod.apply(
          this,
          flatten(args).map((arg: any, i: number) => {
            if ((i === 0 && typeof arg === "string") || arg instanceof RegExp) {
              return arg;
            }
            return wrapParam(arg, bindNext);
          })
        );
      }
      return originalMethod.apply(
        this,
        flatten(args).map((arg: any, i: number) => {
          if ((i === 0 && typeof arg === "string") || arg instanceof RegExp) {
            return arg;
          }
          return wrapMiddleware(arg, bindNext);
        })
      );
    };
  });
  return rtr;
}

export interface PromiseRouterOptions extends RouterOptions {
  bindNext?: Function;
}

export function promiseRouter(
  routerOptions: PromiseRouterOptions = {}
): Router {
  const { bindNext, ...opts } = routerOptions;
  const rtr = Router(opts);
  const originalRoute = rtr.route;
  rtr.route = function wrappedRoute(path: PathParams) {
    const route: IRoute = originalRoute.call(this, path);
    return bindRouteMethods(route, bindNext);
  };
  return bindRouterMethods(rtr, bindNext);
}
