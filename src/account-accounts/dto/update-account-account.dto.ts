import { PartialType } from "@nestjs/swagger";
import { CreateAccountAccountDto } from "./create-account-account.dto";

export class UpdateAccountAccountDto extends PartialType(CreateAccountAccountDto) {}
