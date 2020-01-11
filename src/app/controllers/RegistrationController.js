import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, addMonths } from 'date-fns';
import Plan from '../models/Plan';
import Student from '../models/Student';
import Registration from '../models/Registration';

class RegistrationController {
  async store(req, res) {
    // Check information schema
    const schema = Yup.object().shape({
      student_id: Yup.number().required(),
      plan_id: Yup.number().required(),
      start_date: Yup.date().required(),
      end_date: Yup.date().required(),
      price: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { student_id, plan_id, start_date, end_date } = req.body;

    // Check if student exists
    const studentExists = await Student.findOne({
      where: {
        id: student_id,
      },
    });

    if (!studentExists) {
      return res.status(400).json({ error: 'Student not found' });
    }

    // Check if plan exists
    const plan = await Plan.findOne({
      where: {
        id: plan_id,
      },
    });

    if (!plan) {
      return res.status(400).json({ error: 'Plan not found' });
    }

    const { price, duration } = plan;

    // Check if start date is in the past
    const startDate = startOfHour(parseISO(start_date));

    if (isBefore(startDate, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    // Set end date
    const planDuration = duration;
    const endDate = addMonths(startDate, planDuration);

    // Set full price
    const totalPrice = price * duration;

    // Store data
    await Registration.create({
      student_id,
      plan_id,
      start_date: startDate,
      end_date: endDate,
      price: totalPrice,
    });

    // Show data
    return res.json({
      student_id,
      plan_id,
      start_date,
      end_date,
      price,
    });
  }
}

export default new RegistrationController();
