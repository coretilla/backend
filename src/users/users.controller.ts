import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto';
import { User } from './entities';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '../auth';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile (login or create)',
    description:
      'Get current user profile based on JWT token. If user does not exist, it will be created automatically.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile retrieved or created successfully',
    type: User,
    examples: {
      'existing-user': {
        summary: 'Existing user profile',
        value: {
          id: 1,
          name: 'John Doe',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
        },
      },
      'new-user': {
        summary: 'New user with auto-generated name',
        value: {
          id: 2,
          name: 'user-0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    examples: {
      'invalid-token': {
        summary: 'Invalid JWT token',
        value: {
          statusCode: 401,
          message: 'Unauthorized',
        },
      },
    },
  })
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser): Promise<User> {
    return await this.usersService.getCurrentUserOrCreate(user.walletAddress);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Update current user profile based on JWT token. Only name can be updated.',
  })
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
    description: 'User profile updated successfully',
    type: User,
    examples: {
      success: {
        summary: 'Successful profile update',
        value: {
          id: 1,
          name: 'New Name',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateCurrentUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await this.usersService.updateCurrentUser(
      user.walletAddress,
      updateUserDto,
    );
  }
}
