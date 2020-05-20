import {
  Router,
  Request,
  Response,
  NextFunction,
  RouterOptions,
  RequestParamHandler,
  RequestHandler,
  ErrorRequestHandler,
} from "express";
import { IRoute, PathParams } from "express-serve-static-core";
// @ts-ignore
import flatten from "array-flatten";

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
  "unsubscribe",
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
  "unsubscribe",
];

const isPromise = (val: any) =>
  typeof val === "object" && val !== null && typeof val.catch === "function";

const wrappedArity2 = (middleware: RequestHandlerArity2): RequestHandler => {
  const middlewareName = middleware.name || "<anonymous>";
  const obj: Record<string, RequestHandler> = {
    [middlewareName](req, res, next) {
      const val = middleware(req, res);
      if (isPromise(val)) {
        val.catch(next);
      }
    },
  };
  return obj[middlewareName];
};

const wrappedArity3 = (middleware: RequestHandlerArity3): RequestHandler => {
  const middlewareName = middleware.name || "<anonymous>";
  const obj: Record<string, RequestHandler> = {
    [middlewareName](req, res, next) {
      const val = middleware(req, res, next);
      if (isPromise(val)) {
        val.catch(next);
      }
    },
  };
  return obj[middlewareName];
};

const wrappedArity4 = (
  middleware: RequestHandlerArity4
): ErrorRequestHandler => {
  const middlewareName = middleware.name || "<anonymous>";
  const obj: Record<string, ErrorRequestHandler> = {
    [middlewareName](err, req, res, next) {
      const val = middleware(err, req, res, next);
      if (isPromise(val)) {
        val.catch(next);
      }
    },
  };
  return obj[middlewareName];
};

const wrapParam = (middleware: RequestParamHandler): RequestParamHandler => {
  const middlewareName = middleware.name || "<anonymous>";
  const obj: Record<string, RequestParamHandler> = {
    [middlewareName](req, res, next, value, name) {
      const val = middleware(req, res, next, value, name);
      if (isPromise(val)) {
        val.catch(next);
      }
    },
  };
  return obj[middlewareName];
};

function wrapMiddleware(middleware: PromiseRequestHandler) {
  if (!middleware) {
    return wrappedArity2(middleware);
  }
  switch (middleware.length) {
    case 3:
      return wrappedArity3(middleware as RequestHandlerArity3);
    case 4:
      return wrappedArity4(middleware as RequestHandlerArity4);
  }
  return wrappedArity2(middleware as RequestHandlerArity2);
}

function bindRouteMethods(rtr: IRoute, prependRoutes?: RequestHandler) {
  ROUTE_METHODS.forEach((method) => {
    const originalMethod = rtr[method];
    rtr[method] = function wrappedMethod(...args: any[]) {
      if (prependRoutes) {
        if (
          method === "get" ||
          method === "put" ||
          method === "post" ||
          method === "delete"
        ) {
          if (typeof args[0] === "string" || args[0] instanceof RegExp) {
            const [first, ...rest] = args;
            args = [first, prependRoutes, ...rest];
          }
        }
      }
      return originalMethod.apply(
        this,
        flatten(args).map((arg: any, i: number) => {
          if ((i === 0 && typeof arg === "string") || arg instanceof RegExp) {
            return arg;
          }
          return wrapMiddleware(arg);
        })
      );
    };
  });
  return rtr;
}

function bindRouterMethods(rtr: Router, prependRoutes?: RequestHandler) {
  ROUTER_METHODS.forEach((method) => {
    const originalMethod = rtr[method];
    rtr[method] = function wrappedMethod(...args: any[]) {
      if (method === "param") {
        return originalMethod.apply(
          this,
          flatten(args).map((arg: any, i: number) => {
            if ((i === 0 && typeof arg === "string") || arg instanceof RegExp) {
              return arg;
            }
            return wrapParam(arg);
          })
        );
      }
      if (prependRoutes) {
        if (
          method === "get" ||
          method === "put" ||
          method === "post" ||
          method === "delete"
        ) {
          if (typeof args[0] === "string" || args[0] instanceof RegExp) {
            const [first, ...rest] = args;
            args = [first, prependRoutes, ...rest];
          }
        }
      }
      return originalMethod.apply(
        this,
        flatten(args).map((arg: any, i: number) => {
          if ((i === 0 && typeof arg === "string") || arg instanceof RegExp) {
            return arg;
          }
          return wrapMiddleware(arg);
        })
      );
    };
  });
  return rtr;
}

interface PromiseRouterOptions extends RouterOptions {
  /**
   * Prepends a handler before "get" / "post" / "put" / "delete"
   */
  prependRoutes?: RequestHandler;
}

export function promiseRouter(
  routerOptions: PromiseRouterOptions = {}
): Router {
  const rtr = Router(routerOptions);
  const originalRoute = rtr.route;
  rtr.route = function wrappedRoute(path: PathParams) {
    const route: IRoute = originalRoute.call(this, path);
    return bindRouteMethods(route, routerOptions.prependRoutes);
  };
  return bindRouterMethods(rtr, routerOptions.prependRoutes);
}
