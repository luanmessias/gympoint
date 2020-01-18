import * as Yup from 'yup';
import HelpOrder from '../models/HelpOrder';
import Student from '../models/Student';
import Mail from '../../lib/Mail';

class HelpOrderController {
  async orders(req, res) {
    // get full list without answer
    const orders = await HelpOrder.findAndCountAll({
      where: {
        answer: null,
      },
      attributes: ['id', 'question'],
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'email', 'age', 'weight', 'height'],
        },
      ],
    });

    return res.json(orders);
  }

  async studentOrders(req, res) {
    // Get student id
    const { id } = req.params;

    // get student list off all orders
    const orders = await HelpOrder.findAndCountAll({
      where: {
        student_id: id,
      },
      attributes: ['id', 'question', 'answer'],
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'email', 'age', 'weight', 'height'],
        },
      ],
    });

    return res.json(orders);
  }

  async store(req, res) {
    // Check if student exists
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(400).json({ error: 'Student not found' });
    }

    const student_id = req.params.id;

    // Check schema
    const schema = Yup.object().shape({
      question: Yup.string().required(),
    });
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }
    const { question } = req.body;

    // Add help order

    const helpOrder = await HelpOrder.create({
      student_id,
      question,
    });

    return res.json(helpOrder);
  }

  async update(req, res) {
    // Check if order exists
    const order = await HelpOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(400).json({ error: 'Help order not found' });
    }

    // Check schema
    const schema = Yup.object().shape({
      answer: Yup.string(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { answer } = req.body;

    // Get student data
    const student = await Student.findByPk(order.student_id);

    // Send mail with answer
    await Mail.sendMail({
      to: `${student.name} <${student.email}>`,
      subject: 'Respondemos a sua pergunta',
      template: 'order_help_answer',
      context: {
        student_name: student.name,
        student_email: student.email,
        question: order.question,
        answer: order.answer,
      },
    });

    // Update answer data
    await order.update({
      answer,
      answered_at: new Date(),
    });

    return res.status(200).json(order);
  }
}

export default new HelpOrderController();
