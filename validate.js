const { check } = require("express-validator");

const validationRules = () => {
    return [
        check('name').isLength({ min: 2 }).withMessage('Minimum of 2 characters.').isAlphanumeric().withMessage('Only letters and numbers allowed.'),
        check('email').isEmail().withMessage('Must be an email.').isLength({ min: 3, max: 64 }).withMessage('Min of 3 and max of 64 characters.'),
        check('message').isLength({ min: 2, max: 900 }).withMessage('Min of 2 and max of 900 characters.')
    ]
}

module.exports = validationRules;