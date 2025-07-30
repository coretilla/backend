import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for Stripe webhooks
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Core Neobank API')
    .setDescription(
      `
API for Core Neobank application

## Authentication
Most endpoints require JWT Bearer token authentication. To authenticate:

1. First, get a nonce using GET /auth/nonce?walletAddress=YOUR_WALLET_ADDRESS
2. Sign the nonce with your wallet and call POST /auth/signin 
3. Use the returned access_token as Bearer token for protected endpoints

## Authorization Header Format
For protected endpoints, include the JWT token in the Authorization header:
\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN_HERE
\`\`\`

## Public Endpoints
- GET / (Hello endpoint)
- GET /health (Health check)
- GET /auth/nonce (Generate nonce)
- POST /auth/signin (Sign in with wallet)

## Protected Endpoints
All other endpoints require JWT Bearer token authentication.
    `,
    )
    .setVersion('1.0')
    .addTag('App', 'Application endpoints (public)')
    .addTag('Authentication', 'Authentication endpoints (public)')
    .addTag('Users', 'User management endpoints (protected)')
    .addTag('Payments', 'Payment and deposit endpoints (protected)')
    .addTag('Webhooks', 'Webhook endpoints (internal)')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token obtained from /auth/signin endpoint',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controllers
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation: ${await app.getUrl()}/api`);
}
bootstrap();
