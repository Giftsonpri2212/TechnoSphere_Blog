const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const HttpError = require("../models/errorModel");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
//************************  REGISTER A NEW USER *******************//
//POST : api/users/register
// UNPROTECTED
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, password2 } = req.body;

    // Check if all required fields are filled
    if (!name || !email || !password) {
      return next(new HttpError("Fill in all fields.", 422));
    }

    // Convert email to lowercase for case-insensitive check
    const newEmail = email.toLowerCase();

    // Check if email already exists in the database
    const emailExists = await User.findOne({ email: newEmail });
    if (emailExists) {
      return next(new HttpError("Email already exists.", 422));
    }

    // Check if password meets minimum length requirement
    if (password.trim().length < 6) {
      return next(
        new HttpError("Password should be at least 6 characters.", 422)
      );
    }

    // Check if passwords match
    if (password !== password2) {
      return next(new HttpError("Passwords do not match.", 422));
    }

    // Hash the password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user in the database
    const newUser = await User.create({
      name: name,
      email: newEmail,
      password: hashedPassword,
    });

    // Respond with the newly created user object
    res.status(201).json(`NewUser ${newUser.email} registered.`);
  } catch (error) {
    // Handle any errors during registration process
    return next(new HttpError("User registration failed.", 422));
  }
};

//************************  LOGIN A REGISTERED USER *******************//
//POST : api/users/login
// UNPROTECTED
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(email);
    console.log(password);
    if (!email || !password) {
      return next(new HttpError("Fill in all fields", 422));
    }
    const newEmail = email.toLowerCase();
    const user = await User.findOne({ email: newEmail });
    if (!user) {
      return next(new HttpError("Invalid credentials", 401));
    }
    const comparePass = await bcrypt.compare(password, user.password);
    if (!comparePass) {
      return next(new HttpError("Invalid credentials", 422));
    }
    const { _id: id, name } = user;
    const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({ token, id, name });
  } catch (error) {
    return next(
      new HttpError("Login failed. Please check your credentials.", 422)
    );
  }
};

//************************  USER PROFILE *******************//
//POST : api/users/:id
// PROTECTED
const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("name avatar password");
    if (!user) {
      return next(new HttpError("User not found.", 404));
    }
    res.status(200).json(user);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//************************  CHANGE  USER AVATAR(profile pricture) *******************//
//POST : api/users/change-avatar
// PROTECTED
const changeAvatar = async (req, res, next) => {
  try {
    if (!req.files || !req.files.avatar) {
      return next(new HttpError("Please choose an image", 422));
    }

    const user = await User.findById(req.user.id);
    if (user.avatar) {
      fs.unlink(path.join(__dirname, "..", "uploads", user.avatar), (err) => {
        if (err) {
          return next(new HttpError(err.message));
        }
      });
    }

    const { avatar } = req.files;
    if (avatar.size > 500000) {
      // 500 KB = 500000 bytes
      return next(
        new HttpError("Profile picture too big. Should be less than 500kb", 422)
      );
    }

    const splittedFilename = avatar.name.split(".");
    const newFilename = `${splittedFilename[0]}_${uuid()}.${
      splittedFilename[splittedFilename.length - 1]
    }`;

    avatar.mv(
      path.join(__dirname, "..", "uploads", newFilename),
      async (err) => {
        if (err) {
          return next(new HttpError(err.message));
        }

        const updatedAvatar = await User.findByIdAndUpdate(
          req.user.id,
          { avatar: newFilename },
          { new: true }
        );

        if (!updatedAvatar) {
          return next(new HttpError("Avatar cannot be changed"));
        }

        res.status(200).json(updatedAvatar);
      }
    );
  } catch (error) {
    return next(new HttpError(error.message));
  }
};

//************************  EDIT USER DETAILS *******************//
//POST : api/users/edit-user
// PROTECTED
const editUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, confirmNewPassword } =
      req.body;
    if (
      !name ||
      !currentPassword ||
      !email ||
      !newPassword ||
      !newConfirmNewPassword
    ) {
      return next(new HttpError("Fill in all fields", 422));
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new HttpError("User not found.", 403));
    }

    const emailExist = await User.findOne({ email });
    if (emailExist && emailExist._id.toString() !== req.user.id.toString()) {
      return next(new HttpError("Email already exists.", 422));
    }

    const validateUserPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!validateUserPassword) {
      return next(new HttpError("Invalid Current Password.", 422));
    }

    if (newPassword !== newConfirmNewPassword) {
      return next(new HttpError("New Passwords do not match.", 422));
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    const newInfo = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hash },
      { new: true }
    );

    res.status(200).json(newInfo);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

//************************  GET AUTHORS *******************//
//GET : api/users (not POST)
//UNPROTECTED (since you're just listing authors)
const getAuthors = async (req, res, next) => {
  try {
    const authors = await User.find().select("name avatar posts"); 
    console.log("Authors fetched:", authors); // ✅ Debug
    res.json(authors);
  } catch (error) {
    return next(new HttpError(error.message || "Fetching authors failed", 500));
  }
};



module.exports = {
  registerUser,
  loginUser,
  getUser,
  editUser,
  getUser,
  getAuthors,
  changeAvatar,
};
