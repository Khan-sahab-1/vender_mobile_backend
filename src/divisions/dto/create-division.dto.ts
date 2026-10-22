import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateDivisionDto {
  @ApiProperty({ example: "North Division", description: "Division name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "DIV-NORTH", description: "Unique division code" })
  @IsString()
  @IsNotEmpty()
  code: string;
}

