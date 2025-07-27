import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'User name (only field that can be updated)',
    example: 'John Doe',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100, {
    message: 'Name must be between 1 and 100 characters long',
  })
  name?: string;
}
