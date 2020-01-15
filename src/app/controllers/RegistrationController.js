import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, addMonths, format } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Plan from '../models/Plan';
import Student from '../models/Student';
import Registration from '../models/Registration';
import Mail from '../../lib/Mail';

class RegistrationController {
  async index(req, res) {
    const registrations = await Registration.findAll({
      attributes: [
        'id',
        'student_id',
        'plan_id',
        'start_date',
        'end_date',
        'price',
        'created_at',
        'updated_at',
      ],
    });
    return res.json(registrations);
  }

  async store(req, res) {
    // Check information schema
    const schema = Yup.object().shape({
      student_id: Yup.number().required(),
      plan_id: Yup.number().required(),
      start_date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { student_id, plan_id, start_date, end_date } = req.body;

    // Check if student exists
    const student = await Student.findOne({
      where: {
        id: student_id,
      },
    });

    if (!student) {
      return res.status(400).json({ error: 'Student not found' });
    }

    // Check if student already have a registration
    const registerExists = await Registration.findOne({
      where: {
        student_id,
      },
    });

    if (registerExists) {
      return res.status(400).json({ error: 'Student already registered' });
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

    const formattedEndDate = format(endDate, "'dia' dd 'de' MMMM 'de' yyyy", {
      locale: pt,
    });

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

    // Send mail to confirm register
    await Mail.sendMail({
      to: `${student.name} <${student.email}>`,
      subject: 'Seja bem vindo ao GymPoint!',
      template: 'welcome',
      context: {
        student_name: student.name,
        student_email: student.email,
        plan_title: plan.title,
        plan_duration: plan.duration,
        plan_end: formattedEndDate,
        total_price: totalPrice,
      },
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

  async update(req, res) {
    const schema = Yup.object().shape({
      student_id: Yup.number(),
      plan_id: Yup.number(),
      start_date: Yup.date(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    // Check if registration exists to update
    const reg = await Registration.findOne({
      where: {
        id: req.body.id,
      },
    });

    if (!reg) {
      return res.status(400).json({ error: 'Registration not found' });
    }

    const { plan_id, start_date } = req.body;

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

    // Check if the plan already started
    const checkPastDate = isBefore(reg.start_date, new Date());

    if (checkPastDate) {
      return res.status(400).json({ error: "You can't change started plans" });
    }

    // Check if start date is in the past
    const startDate = startOfHour(parseISO(start_date));
    if (isBefore(startDate, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    // Set end date
    const planDuration = duration;
    const endDate = addMonths(startDate, planDuration);
    const formattedEndDate = format(endDate, "'dia' dd 'de' MMMM 'de' yyyy", {
      locale: pt,
    });

    // Set full price
    const totalPrice = price * duration;

    // Get student data
    const student = await Student.findOne({
      where: {
        id: reg.student_id,
      },
    });

    // Send mail to confirm update
    await Mail.sendMail({
      to: `${student.name} <${student.email}>`,
      subject: 'Seu plano foi atualizado!',
      template: 'update_plan',
      context: {
        student_name: student.name,
        student_email: student.email,
        plan_title: plan.title,
        plan_duration: plan.duration,
        plan_end: formattedEndDate,
        total_price: totalPrice,
      },
    });

    // Update data

    await reg.update({
      id: reg.id,
      student_id: reg.student_id,
      plan_id,
      start_date: startDate,
      end_date: endDate,
      price: totalPrice,
    });

    // Show data
    return res.json({
      id: reg.id,
      student_id: reg.student_id,
      plan_id,
      start_date: startDate,
      end_date: endDate,
      price: totalPrice,
    });
  }
}

export default new RegistrationController();
