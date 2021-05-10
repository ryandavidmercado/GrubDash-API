const path = require("path");
const dishes = require(path.resolve("src/data/dishes-data"));
const nextId = require("../utils/nextId");

//validation middleware
function validateAndExtractDish(req, res, next) {
  const dishId = req.params.dishId;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (typeof foundDish === "undefined")
    return next({
      status: 404,
      message: `Dish does not exist: ${dishId}`,
    });

  res.locals.dish = foundDish;
  next();
}

function validatePostedDish(req, res, next) {
  const dish = req.body.data;
  const checks = ["name", "description", "price", "image_url"];

  for (const check of checks) {
    if (!dish[check]) {
      return next({
        status: 400,
        message: `Dish must include a ${check}`,
      });
    }
  }

  next();
}

function validatePostedPrice(req, res, next) {
  const price = req.body.data.price;
  if (!Number.isInteger(price) || price <= 0) {
    return next({
      status: 400,
      message: "Dish must have a price that is an integer greater than 0",
    });
  }
  next();
}

function validatePutId(req, res, next) {
  const routeId = req.params.dishId;
  const dishId = req.body.data.id;

  if (dishId && dishId !== routeId) {
    return next({
      status: 400,
      message: `Dish id does not match route id. Dish: ${dishId}, Route: ${routeId}`,
    });
  }

  next();
}

// main functions
function list(req, res) {
  res.json({ data: dishes });
}

function read(req, res) {
  res.json({ data: res.locals.dish });
}

function create(req, res) {
  const { name, description, price, image_url } = req.body.data;
  const id = nextId();

  const newDish = { id, name, description, price, image_url };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

function update(req, res) {
  const newDish = req.body.data;
  const oldDish = res.locals.dish;

  Object.keys(oldDish).forEach((key) => {
    // skip update for id
    if (key !== "id") {
      oldDish[key] = newDish[key];
    }
  });

  res.json({ data: oldDish });
}

module.exports = {
  list,
  read: [validateAndExtractDish, read],
  create: [validatePostedDish, validatePostedPrice, create],
  update: [
    validateAndExtractDish,
    validatePostedDish,
    validatePostedPrice,
    validatePutId,
    update,
  ],
};
