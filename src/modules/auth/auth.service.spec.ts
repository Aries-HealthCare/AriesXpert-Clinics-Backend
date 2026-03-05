import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { TherapistsService } from "../therapists/therapists.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { ClinicsService } from "../clinics/clinics.service";

describe("AuthService", () => {
  let service: AuthService;

  const mockUser = {
    _id: "user123",
    id: "user123",
    email: "test@example.com",
    password: "hashedpassword",
    firstName: "Test",
    lastName: "User",
    role: "therapist",
    comparePassword: jest.fn().mockResolvedValue(true),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockTherapistsService = {
    create: jest.fn(),
    findByUserId: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue("mockToken"),
  };

  const mockClinicsService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TherapistsService, useValue: mockTherapistsService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ClinicsService, useValue: mockClinicsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("login", () => {
    it("should return token for valid credentials", async () => {
      jest
        .spyOn(bcrypt, "compare")
        .mockImplementation(() => Promise.resolve(true));
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.login({
        email: "test@example.com",
        password: "password",
      });

      expect(result).toHaveProperty("token");
      expect(result.user.email).toEqual("test@example.com");
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith("user123");
    });

    it("should handle mock login", async () => {
      process.env.ALLOW_DEV_BACKDOOR = "true";
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        _id: "user123",
        id: "user123",
        email: "akshaypatel@ariesxpert.com",
        firstName: "Akshay",
        lastName: "Patel",
        role: "founder",
      });

      const result = await service.login({
        email: "akshaypatel@ariesxpert.com",
        password: "12345",
      });
      expect(result.user.role).toEqual("founder");
      expect(result.token).toBeDefined();
    });
  });
});
