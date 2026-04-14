import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuickReplyService } from './quick-reply.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../entities';

@ApiTags('Quick Reply')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quick-replies')
export class QuickReplyController {
  constructor(private readonly service: QuickReplyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all quick replies for current user' })
  findAll(@CurrentUser() user: User) {
    return this.service.findAllByUser(user.user_id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a quick reply' })
  create(@CurrentUser() user: User, @Body() body: { label: string; text: string }) {
    return this.service.create(user.user_id, body.label, body.text);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a quick reply' })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { label?: string; text?: string; sort_order?: number },
  ) {
    return this.service.update(user.user_id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quick reply' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user.user_id, id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder quick replies' })
  reorder(@CurrentUser() user: User, @Body() body: { ids: string[] }) {
    return this.service.reorder(user.user_id, body.ids);
  }
}
