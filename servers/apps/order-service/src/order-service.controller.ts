import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from '../../../libs/shared/src/roles.decorator';
import { CartService } from './cart/cart.service';
import { AddToCartDto, UpdateCartItemDto } from './cart/cart.dto';
import { OrderService } from './order/order.service';
import {
  CheckoutDto,
  UpdateOrderStatusDto,
  AssignDeliveryDto,
  RateOrderDto,
  OrderFilterDto,
} from './order/checkout.dto';
import { ChatService } from './chat/chat.service';
import { SendMessageDto } from './chat/chat.dto';
import { PromoService } from './promo/promo.service';
import { CreatePromoCodeDto, UpdatePromoCodeDto, ValidatePromoDto } from './promo/promo.dto';
import { ReceiptService } from './receipt/receipt.service';

@Controller()
export class OrderServiceController {
  constructor(
    private readonly cartService: CartService,
    private readonly orderService: OrderService,
    private readonly chatService: ChatService,
    private readonly promoService: PromoService,
    private readonly receiptService: ReceiptService,
  ) {}

  // ─────────────────────────────────────────────
  // CART (customer only)
  // ─────────────────────────────────────────────

  @Get('cart')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async getCart(@Req() req: any) {
    const cart = await this.cartService.get(req.user.sub);
    return { data: cart ?? { items: [], subtotal: 0 }, message: null };
  }

  @Post('cart/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async addToCart(@Req() req: any, @Body() dto: AddToCartDto) {
    const cart = await this.cartService.add(req.user.sub, dto);
    return { data: cart, message: 'تمت إضافة الوجبة إلى السلة' };
  }

  @Patch('cart/items/:mealId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async updateCartItem(
    @Req() req: any,
    @Param('mealId') mealId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const cart = await this.cartService.update(req.user.sub, mealId, dto);
    return { data: cart, message: 'تم تحديث السلة' };
  }

  @Delete('cart/items/:mealId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async removeCartItem(@Req() req: any, @Param('mealId') mealId: string) {
    const cart = await this.cartService.removeItem(req.user.sub, mealId);
    return { data: cart, message: 'تم حذف الوجبة من السلة' };
  }

  @Delete('cart')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async clearCart(@Req() req: any) {
    await this.cartService.clear(req.user.sub);
    return { data: null, message: 'تم مسح السلة' };
  }

  // ─────────────────────────────────────────────
  // CHECKOUT
  // ─────────────────────────────────────────────

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async checkout(
    @Req() req: any,
    @Body() dto: CheckoutDto,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    // Validate that the header value is a UUID when present
    if (idempotencyHeader !== undefined) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(idempotencyHeader)) {
        throw new BadRequestException('Idempotency-Key يجب أن يكون UUID صالحاً');
      }
      dto.idempotencyKey = idempotencyHeader;
    }

    const user = req.user;
    const order = await this.orderService.checkout(
      user.sub,
      { name: user.fullName ?? user.sub, phone: user.phone ?? '', role: user.role },
      dto,
    );

    const isIdempotent = (order as any)._idempotent === true;
    return {
      data: order,
      message: isIdempotent ? 'تم إرجاع الطلب الموجود' : 'تم إنشاء الطلب بنجاح',
    };
  }

  // ─────────────────────────────────────────────
  // ORDERS
  // ─────────────────────────────────────────────

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async listOrders(@Req() req: any, @Query() dto: OrderFilterDto) {
    const result = await this.orderService.list(req.user.sub, req.user.role, dto);
    return { data: result, message: null };
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  async getOrder(@Req() req: any, @Param('id') id: string) {
    const order = await this.orderService.findOne(id, req.user.sub, req.user.role);
    return { data: order, message: null };
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.orderService.updateStatus(id, req.user.sub, req.user.role, dto);
    return { data: order, message: 'تم تحديث حالة الطلب' };
  }

  @Patch('orders/:id/delivery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager', 'restaurant_owner')
  async assignDelivery(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AssignDeliveryDto,
  ) {
    const result = await this.orderService.assignDelivery(id, req.user.sub, req.user.role, dto);
    return { data: result, message: 'تم تعيين عامل التوصيل' };
  }

  @Post('orders/:id/rate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async rateOrder(@Req() req: any, @Param('id') id: string, @Body() dto: RateOrderDto) {
    const rating = await this.orderService.rate(id, req.user.sub, dto);
    return { data: rating, message: 'شكراً على تقييمك' };
  }

  @Get('orders/:id/receipt')
  @UseGuards(JwtAuthGuard)
  async getReceipt(@Req() req: any, @Param('id') id: string) {
    const order = await this.orderService.findOne(id, req.user.sub, req.user.role);
    if (!order.receiptKey) return { data: null, message: 'الإيصال لم يُنشأ بعد' };
    const url = await this.receiptService.getPresignedUrl(order.receiptKey);
    return { data: { url }, message: null };
  }

  // ─────────────────────────────────────────────
  // DELIVERY AGENTS
  // ─────────────────────────────────────────────

  @Get('delivery/available')
  @UseGuards(JwtAuthGuard)
  async getAvailableAgents(@Req() req: any) {
    return this.orderService.getAvailableAgents(req.user.sub, req.user.role);
  }

  // ─────────────────────────────────────────────
  // CHAT
  // ─────────────────────────────────────────────

  @Get('orders/:id/chat')
  @UseGuards(JwtAuthGuard)
  async getChat(@Req() req: any, @Param('id') id: string) {
    const messages = await this.chatService.getMessages(id, req.user.sub, req.user.role);
    return { data: messages, message: null };
  }

  @Post('orders/:id/chat')
  @UseGuards(JwtAuthGuard)
  async sendMessage(@Req() req: any, @Param('id') id: string, @Body() body: { content: string }) {
    const user = req.user;
    const msg = await this.chatService.send(
      user.sub,
      { name: user.fullName ?? user.sub, role: user.role },
      { orderId: id, content: body.content },
    );
    return { data: msg, message: null };
  }

  // ─────────────────────────────────────────────
  // PROMO CODES
  // ─────────────────────────────────────────────

  @Post('promo/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async validatePromo(@Req() req: any, @Body() dto: ValidatePromoDto) {
    const result = await this.promoService.validate(
      dto.code,
      dto.orderAmount,
      req.user.sub,
      dto.restaurantId,
    );
    return { data: result, message: 'الكوبون صالح' };
  }

  @Get('manager/promo-codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  async listPromoCodes(@Query('restaurantId') restaurantId?: string) {
    const codes = await this.promoService.list(restaurantId);
    return { data: codes, message: null };
  }

  @Post('manager/promo-codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  async createPromoCode(@Body() dto: CreatePromoCodeDto) {
    const code = await this.promoService.create(dto);
    return { data: code, message: 'تم إنشاء كود الخصم' };
  }

  @Patch('manager/promo-codes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  async updatePromoCode(@Param('id') id: string, @Body() dto: UpdatePromoCodeDto) {
    const code = await this.promoService.update(id, dto);
    return { data: code, message: 'تم تحديث كود الخصم' };
  }

  @Delete('manager/promo-codes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  async deletePromoCode(@Param('id') id: string) {
    await this.promoService.remove(id);
    return { data: null, message: 'تم حذف كود الخصم' };
  }

  // ─────────────────────────────────────────────
  // NATS EVENT HANDLERS
  // ─────────────────────────────────────────────

  @EventPattern('order.archive.chat')
  async handleArchiveChat(@Payload() data: { orderId: string }) {
    await this.chatService.archiveByOrder(data.orderId);
  }
}
