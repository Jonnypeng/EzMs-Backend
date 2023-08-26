import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthDto } from "./dto";
import * as argon from "argon2";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
    ) {}

    async signup(dto: AuthDto): Promise<{
        email: string;
        createdAt: Date;
    }> {
        const USER = await this.prisma.user.findUnique({
            where: {
                email: dto.email,
            },
            select: {
                email: true,
            },
        });

        if (USER) {
            throw new HttpException(`User already exsist`, HttpStatus.CONFLICT);
        }
        const returnUser = await this.prisma.CreateUser(dto);

        return returnUser;
    }

    async signin(dto: AuthDto): Promise<{ accessToken: string }> {
        const USER = await this.prisma.user.findUnique({
            where: {
                email: dto.email,
            },
            select: {
                email: true,
                hash: true,
                role: true,
            },
        });

        if (!USER) {
            throw new HttpException(
                `${dto.email} does not exsist`,
                HttpStatus.FORBIDDEN,
            );
        }

        const VALID = await argon.verify(USER.hash, dto.password);

        if (!VALID) {
            throw new HttpException(
                "Incorrect Credentials",
                HttpStatus.FORBIDDEN,
            );
        }

        return this.signToken(USER.email, USER.role);
    }

    async signToken(
        email: string,
        role: string,
    ): Promise<{ accessToken: string }> {
        const PAYLOAD = {
            email,
            role,
        };

        const JWT_SECRET = this.config.get("JWT_SECRET");
        const JWT_ISSUER = this.config.get("JWT_ISSUER");
        const TOKEN = await this.jwt.signAsync(PAYLOAD, {
            expiresIn: "1h",
            secret: JWT_SECRET,
            issuer: JWT_ISSUER || "HelloWorld",
        });

        return {
            accessToken: TOKEN,
        };
    }
}
