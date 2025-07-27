import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, LoginUserDto } from './dto';
import { User } from './entities';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Login or create user',
  })
  @ApiBody({
    type: LoginUserDto,
    examples: {
      'existing-user': {
        summary: 'Login existing user',
        description: 'Only wallet address needed for existing users',
        value: {
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
        },
      },
      'new-user-with-name': {
        summary: 'Create new user with custom name',
        description: 'Both name and wallet address provided for new users',
        value: {
          name: 'John Doe',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
        },
      },
      'new-user-auto-name': {
        summary: 'Create new user with auto-generated name',
        description:
          'Only wallet address needed, name will be auto-generated as user-{wallet_address}',
        value: {
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User logged in or created successfully',
    type: User,
    examples: {
      'existing-user': {
        summary: 'Existing user login',
        value: {
          id: 1,
          name: 'John Doe',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
        },
      },
      'new-user-custom-name': {
        summary: 'New user with custom name',
        value: {
          id: 2,
          name: 'John Doe',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
        },
      },
      'new-user-auto-name': {
        summary: 'New user with auto-generated name',
        value: {
          id: 3,
          name: 'user-0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid wallet address format',
    examples: {
      'invalid-wallet': {
        summary: 'Invalid wallet address format',
        value: {
          statusCode: 400,
          message: ['wallet_address must be a valid Ethereum address'],
          error: 'Bad Request',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - Rare case where wallet address conflicts occur during concurrent requests',
    examples: {
      conflict: {
        summary: 'Wallet address conflict',
        value: {
          statusCode: 409,
          message: 'Wallet address already exists',
          error: 'Conflict',
        },
      },
    },
  })
  async loginOrCreate(@Body() loginUserDto: LoginUserDto): Promise<User> {
    return await this.usersService.loginOrCreate(loginUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
    type: [User],
  })
  async findAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: User,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return await this.usersService.findOne(id);
  }

  @Get('wallet/:address')
  @ApiOperation({ summary: 'Get user by wallet address' })
  @ApiParam({ name: 'address', type: 'string', description: 'Wallet address' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: User,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findByWallet(@Param('address') address: string): Promise<User> {
    return await this.usersService.findByWalletAddress(address);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user name by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID' })
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      'update-name': {
        summary: 'Update user name',
        description:
          'Only name field can be updated, wallet address is immutable',
        value: {
          name: 'New Name',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User name updated successfully',
    type: User,
    examples: {
      success: {
        summary: 'Successful name update',
        value: {
          id: 1,
          name: 'New Name',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await this.usersService.update(id, updateUserDto);
  }

  @Patch('wallet/:address')
  @ApiOperation({ summary: 'Update user name by wallet address' })
  @ApiParam({ name: 'address', type: 'string', description: 'Wallet address' })
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      'update-name': {
        summary: 'Update user name',
        description:
          'Only name field can be updated, wallet address is immutable',
        value: {
          name: 'New Name',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User name updated successfully',
    type: User,
    examples: {
      success: {
        summary: 'Successful name update',
        value: {
          id: 1,
          name: 'New Name',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateByWallet(
    @Param('address') address: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await this.usersService.updateByWalletAddress(address, updateUserDto);
  }

}
