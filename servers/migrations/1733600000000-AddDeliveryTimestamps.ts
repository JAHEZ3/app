import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the delivery lifecycle timestamps used by the driver dashboard and the
 * customer tracking timeline:
 *   - assigned_at : when a driver was attached to the order
 *   - accepted_at : when the assigned driver accepted (auto-stamped for
 *                   manager/owner dispatch, which is auto-accepted)
 *
 * `delivered_at` already exists on the orders table, so it is not touched here.
 * Columns are nullable — existing rows simply have NULLs until the next event.
 */
export class AddDeliveryTimestamps1733600000000 implements MigrationInterface {
  name = 'AddDeliveryTimestamps1733600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "accepted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "assigned_at"`,
    );
  }
}
