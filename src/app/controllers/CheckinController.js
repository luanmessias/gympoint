import * as Yup from 'yup';
import {
  startOfHour,
  parseISO,
  isBefore,
  addMonths,
  format,
  subDays,
  startOfToday,
  endOfToday,
} from 'date-fns';
import pt from 'date-fns/locale/pt';
import Checkin from '../models/Checkin';
import Student from '../models/Student';

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
          $between: [startOfToday(new Date()), endOfToday(new Date())],
        },
      },
    });

    console.log(checkin);

    if (checkin) {
      return res
        .status(400)
        .json({ error: "Today's checkin has already been done." });
    }

    // Check if student have reached 5 checkins in 7 days
    const startDate = await subDays(new Date(), 7);
    const endDate = await new Date();
    const countCheckins = await Checkin.findAndCountAll({
      where: {
        from: {
          $between: [startDate, endDate],
        },
      },
    });

    return res.json('Fim');
  }
}

export default new CheckinController();
