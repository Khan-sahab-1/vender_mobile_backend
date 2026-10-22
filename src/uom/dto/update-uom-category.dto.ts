import { PartialType } from '@nestjs/swagger';
import { CreateUomCategoryDto } from './create-uom-category.dto';

export class UpdateUomCategoryDto extends PartialType(CreateUomCategoryDto) {}
