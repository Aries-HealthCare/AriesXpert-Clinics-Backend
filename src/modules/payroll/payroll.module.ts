import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { Payroll, PayrollSchema } from './schemas/payroll.schema';
import { Salary, SalarySchema } from './schemas/salary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payroll.name, schema: PayrollSchema },
      { name: Salary.name, schema: SalarySchema },
    ]),
  ],
  providers: [PayrollService],
  controllers: [PayrollController],
  exports: [PayrollService]
})
export class PayrollModule { }
