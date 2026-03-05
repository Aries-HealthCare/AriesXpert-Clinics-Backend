import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongooseModule } from "@nestjs/mongoose";
import { AppModule } from "./../src/app.module";

describe("AppController (e2e)", () => {
  let app: INestApplication;
  let authToken: string;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // 1. Authentication Flow
  it("/auth/login (POST) - Mock Login", () => {
    return request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "founder@ariesxpert.com", password: "12345" })
      .expect(201)
      .then((response) => {
        expect(response.body).toHaveProperty("token");
        authToken = response.body.token;
      });
  });

  // 2. Lead Creation (Public)
  it("/leads/public (POST) - Create Lead", () => {
    return request(app.getHttpServer())
      .post("/leads/public")
      .send({
        fullName: "E2E Test User",
        phone: "9876543210",
        email: "e2e@test.com",
        service: "Physiotherapy",
        city: "Mumbai",
      })
      .expect(201)
      .then((response) => {
        expect(response.body).toHaveProperty("_id");
        expect(response.body.name).toEqual("E2E Test User");
      });
  });

  // 3. Protected Route (Therapists Search)
  it("/therapists/search (GET) - Search Therapists", () => {
    return request(app.getHttpServer())
      .get("/therapists/search?city=Mumbai")
      .expect(200)
      .then((response) => {
        expect(Array.isArray(response.body)).toBe(true);
      });
  });

  // 4. Create Patient (Protected)
  it("/patients (POST) - Create Patient", () => {
    return request(app.getHttpServer())
      .post("/patients")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        firstName: "E2E",
        lastName: "Patient",
        phone: "1122334455",
        city: "Mumbai",
      })
      .expect(201)
      .then((response) => {
        expect(response.body).toHaveProperty("_id");
        expect(response.body.firstName).toEqual("E2E");
      });
  });
});
