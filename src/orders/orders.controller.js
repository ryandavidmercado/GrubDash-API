const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");

//middleware
function validatePostedOrder(req, res, next) {
  const order = req.body.data;
  const checks = ["deliverTo", "mobileNumber", "dishes"];

  for (const check of checks) {
    if (!order[check]) {
      return next({
        status: 400,
        message: `Order must include a ${check}`,
      });
    }
  }

  next();
}

function validatePostedDishes(req, res, next) {
  const { dishes } = req.body.data;

  if (!dishes.length || !Array.isArray(dishes)) {
    return next({
      status: 400,
      message: "Order must include at least one dish",
    });
  }

  for (const [index, dish] of dishes.entries()) {
    const { quantity } = dish;
    if (!quantity || !Number.isInteger(quantity) || quantity < 0) {
      return next({
        status: 400,
        message: `Dish ${index} must have a quantity that is an integer greater than 0`,
      });
    }
  }

  next();
}

function validateAndExtractOrderById(req, res, next) {
  const { orderId } = req.params;
  const order = orders.find((order) => order.id === orderId);

  if (typeof order === "undefined") {
    return next({
      status: 404,
      message: `Order does not exist: ${orderId}`,
    });
  }

  res.locals.order = order;
  next();
}

function validatePutId(req, res, next) {
  const routeId = req.params.orderId;
  const orderId = req.body.data.id;

  if (orderId && orderId !== routeId) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${orderId}, Route: ${routeId}`,
    });
  }

  next();
}

function validatePutStatus(req, res, next) {
  const newStatus = req.body.data.status;
  const oldStatus = res.locals.order.status;
  const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];

  if (oldStatus === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed",
    });
  }

  if (!validStatus.includes(newStatus)) {
    return next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered",
    });
  }

  next();
}

function validateDelete(req, res, next) {
  const { status } = res.locals.order;
  if (status !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be deleted unless it is pending",
    });
  }

  next();
}

//main functions
function list(req, res) {
  res.json({ data: orders });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function create(req, res) {
  const id = nextId();
  const newDish = { id, ...req.body.data };

  orders.push(newDish);
  res.status(201).json({ data: newDish });
}

function update(req, res) {
  const newOrder = req.body.data;
  const oldOrder = res.locals.order;

  Object.keys(oldOrder).forEach((key) => {
    //skip update for id
    if (key !== "id") {
      oldOrder[key] = newOrder[key];
    }
  });

  res.json({ data: oldOrder });
}

function destroy(req, res) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);

  orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [validatePostedOrder, validatePostedDishes, create],
  read: [validateAndExtractOrderById, read],
  update: [
    validateAndExtractOrderById,
    validatePostedOrder,
    validatePostedDishes,
    validatePutId,
    validatePutStatus,
    update,
  ],
  destroy: [validateAndExtractOrderById, validateDelete, destroy],
};
