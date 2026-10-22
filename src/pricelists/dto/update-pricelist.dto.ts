import { PartialType } from '@nestjs/swagger';
import { CreatePricelistDto } from './create-pricelist.dto';

export class UpdatePricelistDto extends PartialType(CreatePricelistDto) {}
