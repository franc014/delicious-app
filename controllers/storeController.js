const mongoose = require('mongoose');
const Store = mongoose.model('Store');

const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');
const User = mongoose.model('User');


const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) { //es6
        const isPhoto = file.mimetype.startsWith('image/');
        if (isPhoto) {
            next(null, true);
        } else {
            next({ message: 'that filetype isn\'t allowed' }, false);
        }
    }
}




exports.homePage = (req, res) => {
    res.render('index', { hi: 'hi', name: req.name });
}

exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store' });
}

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
    if (!req.file) {
        next();
        return;
    }
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);

    next();
}

exports.createStore = async (req, res) => {
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {

    const page = req.params.page || 1;
    const limit = 4;
    const skip = (page * limit) - limit;

    const countPromise = Store.count();

    const storesProimise = Store
        .find()
        .skip(skip)
        .limit(limit);

    const [stores, count] = await Promise.all([storesProimise, countPromise]);
    const pages = Math.ceil(count / limit);

    if (!stores.length && skip) {
        req.flash('info', `Hey! You have asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`);
        res.redirect(`/stores/page/${pages}`);
        return;
    }


    res.render('stores', { title: 'Stores', stores, page, count, pages });
}

exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores();
    res.render('topStores', { 'title': 'Top Stores', stores });
}

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({ slug: req.params.slug })
        .populate('author reviews');

    if (!store) return next();//return 404

    res.render('store', { store, title: store.name });
}

const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) {
        throw Error('You must own a store in order to edit it!');
    }
}

exports.editStore = async (req, res) => {
    const store = await (Store.findOne({ _id: req.params.id }));
    confirmOwner(store, req.user);
    res.render('editStore', { 'title': `Edit Store ${store.name}`, store });
}

exports.updateStore = async (req, res) => {
    req.body.location.type = 'Point';
    const store = await Store.findByIdAndUpdate({ _id: req.params.id }, req.body, {
        new: true,
        runValidators: true
    }).exec();
    req.flash('success', `Store ${store.name} has been updated`);
    res.redirect(`/stores/${store._id}/edit`);

}

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true }; //give me stores that have at leat a one tag on it

    const tagsPromise = Store.getTagsList();
    const storesPromise = Store.find({ tags: tagQuery });

    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

    res.render('tags', { title: 'tags', tags, stores, tag });
}

exports.mapPage = (req, res) => {
    res.render('map', { title: 'MAP' });
}

exports.searchStores = async (req, res) => {
    const stores = await Store.find({
        $text: {
            $search: req.query.q
        }
    }, {
            score: { $meta: 'textScore' }
        }).sort({
            score: { $meta: 'textScore' }
        })

        ;
    res.json(stores);
}

exports.mapStores = async (req, res) => {
    const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
    const q = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates
                },
                $maxDistance: 10000 //10km
            }
        }
    };

    const stores = await Store.find(q).select('slug name description location photo');
    res.json(stores);
}

exports.heartStore = async (req, res) => {
    const hearts = req.user.hearts.map(obj => obj.toString());

    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';//addToSet: unique id
    const user = await User.findByIdAndUpdate(req.user._id,
        { [operator]: { hearts: req.params.id } },
        { new: true }
    );
    //User.findOneAndUpdate
    res.json(user);

}

exports.getHearts = async (req, res) => {
    const stores = await Store.find({
        _id: { $in: req.user.hearts }
    });
    res.render('stores', { title: 'Hearted Stores', stores })
};

