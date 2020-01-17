import { subDays, startOfToday, endOfToday } from 'date-fns';
import Sequelize from 'sequelize';
import Checkin from '../models/Checkin';
import Student from '../models/Student';

const { Op } = Sequelize;

class CheckinController {
  async store(req, res) {
    // Check if student exists
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(400).json({ error: 'Student not found' });
    }

    const student_id = req.params.id;

    // Check if check-in is already registered today
    const checkin = await Checkin.findOne({
      where: {
        student_id,
        created_at: {
          [Op.between]: [startOfToday(new Date()), endOfToday(new Date())],
        },
      },
    });

    if (checkin) {
      return res
        .status(400)
        .json({ error: "Today's checkin has already been done." });
    }

    // Check if student have reached 5 checkins in 7 days
    const countCheckins = await Checkin.findAndCountAll({
      where: {
        created_at: {
          [Op.between]: [subDays(new Date(), 7), new Date()],
        },
      },
    });

    if (countCheckins.count >= 5) {
      return res.status(400).json({
        error: "You've reached the maximum of 5 check-ins in 7 days.",
      });
    }

    // Store data
    await Checkin.create({ student_id });

    return res.json('Fim');
  }
}

export default new CheckinController();
