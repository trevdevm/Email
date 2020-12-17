const { check } = require("express-validator");

const validationRules = () => {
    return [
        check('name').isLength({ min: 2, max: 25 }).withMessage('Min of 2 and max of 25 characters in name.'),
        check('email').isEmail().withMessage('Email must be an email.').isLength({ min: 3, max: 64 }).withMessage('Min of 3 and max of 64 characters in email.'),
        check('message').isLength({ min: 5, max: 900 }).withMessage('Min of 5 and max of 900 characters in message.')
    ]
}

module.exports = validationRules;