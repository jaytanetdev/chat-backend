import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from '../../entities';
import { AppException, ErrorCode } from '../../common/errors';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
  ) {}

  async create(dto: CreateShopDto, createBy: string): Promise<Shop> {
    const shop = this.shopRepository.create({
      ...dto,
      create_by: createBy,
      update_by: createBy,
    });
    return this.shopRepository.save(shop);
  }

  async findAll(): Promise<Shop[]> {
    return this.shopRepository.find({ order: { create_at: 'DESC' } });
  }

  async findOne(id: string): Promise<Shop> {
    const shop = await this.shopRepository.findOne({ where: { shop_id: id } });
    if (!shop) {
      throw new AppException(ErrorCode.SHOP_NOT_FOUND, 'Shop not found', HttpStatus.NOT_FOUND);
    }
    return shop;
  }

  async update(id: string, dto: UpdateShopDto, updateBy: string): Promise<Shop> {
    const shop = await this.findOne(id);
    Object.assign(shop, dto, { update_by: updateBy });
    return this.shopRepository.save(shop);
  }

  async remove(id: string): Promise<void> {
    const shop = await this.findOne(id);
    await this.shopRepository.remove(shop);
  }
}
