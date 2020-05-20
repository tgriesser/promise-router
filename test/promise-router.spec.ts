import express, { ErrorRequestHandler } from "express";
import supertest from "supertest";
import { promiseRouter } from "../src/promise-router";

describe("promise-router", () => {
  test("should propagate errors", async () => {
    const rtr = promiseRouter();
    const app = express();

    rtr.get("/some-route", async (req, res) => {
      throw new Error("Errored");
    });

    const errHandler: ErrorRequestHandler = (err, req, res, next) => {
      expect(err.message).toEqual("Errored");
      res.sendStatus(400);
    };

    rtr.use(errHandler);

    app.use(rtr);

    await supertest(app).get("/some-route").expect(400);
  });

  test("should propagate errors in error handlers", async () => {
    const rtr = promiseRouter();
    const app = express();

    rtr.get("/some-route", async (req, res) => {
      throw new Error("Errored");
    });

    const errHandler: ErrorRequestHandler = async (err, req, res, next) => {
      expect(err.message).toEqual("Errored");

      throw new Error("Second Errored");

      res.sendStatus(400);
    };

    const appErrHandler: ErrorRequestHandler = async (err, req, res, next) => {
      expect(err.message).toEqual("Second Errored");

      res.sendStatus(422);
    };

    rtr.use(errHandler);

    app.use(rtr);
    app.use(appErrHandler);

    await supertest(app).get("/some-route").expect(422);
  });

  test("prependRoutes", async () => {
    const rtr = promiseRouter({
      prependRoutes: (req, res, next) => {
        // @ts-ignore
        req.someItem = true;
        next();
      },
    });
    const app = express();

    rtr.get("/some-route", async (req, res) => {
      // @ts-ignore
      expect(req.someItem).toEqual(true);
      res.sendStatus(200);
    });

    rtr.post("/some-route", async (req, res) => {
      // @ts-ignore
      expect(req.someItem).toEqual(true);
      res.sendStatus(200);
    });

    rtr.put("/some-route", async (req, res) => {
      // @ts-ignore
      expect(req.someItem).toEqual(true);
      res.sendStatus(200);
    });

    rtr.delete("/some-route", async (req, res) => {
      // @ts-ignore
      expect(req.someItem).toEqual(true);
      res.sendStatus(200);
    });

    rtr.options("/some-route", async (req, res) => {
      // @ts-ignore
      expect(req.someItem).toBeUndefined();
      res.sendStatus(200);
    });

    app.use(rtr);

    await supertest(app).get("/some-route").expect(200);

    await supertest(app).get("/some-route").expect(200);

    await supertest(app).get("/some-route").expect(200);

    await supertest(app).get("/some-route").expect(200);

    await supertest(app).options("/some-route").expect(200);
  });
});
