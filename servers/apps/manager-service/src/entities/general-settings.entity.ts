import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('general_settings')
export class GeneralSettings {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ name: 'platform_name', length: 150, default: 'جاهز' })
  platformName: string;

  @Column({ name: 'support_email', length: 150, default: 'support@jahaz.app' })
  supportEmail: string;

  @Column({ name: 'support_phone', length: 30, default: '920012345' })
  supportPhone: string;

  @Column({ name: 'support_whatsapp', length: 30, nullable: true })
  supportWhatsapp: string | null;

  @Column({ name: 'support_address', type: 'text', nullable: true })
  supportAddress: string | null;

  @Column({ name: 'support_hours', length: 200, nullable: true })
  supportHours: string | null;

  @Column({ name: 'default_language', length: 10, default: 'ar' })
  defaultLanguage: string;

  @Column({ length: 10, default: 'ILS' })
  currency: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
