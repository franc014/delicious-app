const mongoose = require("mongoose"); //package to interface with mongodb
mongoose.Promise = global.Promise; //use the es6 built in Promise, to be able to use async-await
const slug = require("slugs"); //to make friendly urls

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: "Please enter a store name"
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: "Point"
    },
    coordinates: [
      {
        type: Number,
        required: "You must supply coordinates!"
      }
    ],
    address: {
      type: String,
      required: "You must supply an address!"
    }
  },
  photo: String,
  tags: [String],
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: "You must supply an author"
  }
});

//set indexes

storeSchema.index({
  name: "text",
  description: "text"
});

storeSchema.index({
  location: "2dsphere"
});

//we'll use autogenerated slugs
//pre hook to create the slug before data is saved,

storeSchema.pre("save", async function(next) {
  if (!this.isModified) {
    next(); //skip it
    return;
  }
  //this is the store we're trying to save
  this.slug = slug(this.name);

  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, "i");

  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });

  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }

  //like a middleware, allowing to continue saving the data
  next();

  //todo make more resiliant so slugs are unique
});

//use proper funciton instead of arrow function to be able to use 'this'
//mongo db aggregate operations
storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    //this array is a pipe
    { $unwind: "$tags" }, //get an instance for each tag,
    { $group: { _id: "$tags", count: { $sum: 1 } } }, //grup stores by tag and sum them
    { $sort: { count: -1 } }
  ]);
};

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    //Lookup stores and populate their reviews
    //we cant use the virtual reviews here because it's a mongoose specific thing
    //and aggregate is not mongoose specific, it pases it right though MongoDB
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "store",
        as: "reviews"
      }
    },
    //filter for only items that have 2 or more reviews
    { $match: { "reviews.1": { $exists: true } } },

    //add the average reviews field
    //project means add a field
    {
      $addFields: {
        //addFields only aftgr mongodb 3.4
        averageRating: { $avg: "$reviews.rating" }
      }
    },
    //sort it by our new field, highest reviews first
    {
      $sort: { averageRating: -1 }
    },
    //limit to at most 10
    {
      $limit: 10
    }
  ]);
};

function autopopulate(next) {
  this.populate("reviews");
  next();
}

storeSchema.pre("find", autopopulate);
storeSchema.pre("findOne", autopopulate);

//find reviews where the stores _id === reviews
storeSchema.virtual("reviews", {
  ref: "Review", //what model to link
  localField: "_id", //which field on the store
  foreignField: "store" //which field on the review
});

module.exports = mongoose.model("Store", storeSchema);
