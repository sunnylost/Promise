var Promise       = require( '../promise' ),
    maxTimeLength = 100,
    STATIC_VALUE  = 'static-value'

function fakeAsyncOperation( fn ) {
    setTimeout( () => {
        fn()
    }, maxTimeLength * Math.random() )
}

describe( 'Promise', () => {
    describe( 'basic', () => {
        it( 'resolve without value', done => {
            new Promise( resolve => {
                fakeAsyncOperation( resolve )
            } ).then( done )
        } )

        it( 'resolve with value', done => {
            new Promise( resolve => {
                fakeAsyncOperation( () => {
                    resolve( STATIC_VALUE )
                } )
            } ).then( val => {
                if ( val === STATIC_VALUE ) {
                    done()
                }
            } )
        } )

        it( 'reject without value', done => {
            new Promise( ( resolve, reject ) => {
                fakeAsyncOperation( reject )
            } ).then( () => {
            }, done )
        } )

        it( 'reject with value', done => {
            new Promise( ( resolve, reject ) => {
                fakeAsyncOperation( () => {
                    reject( STATIC_VALUE )
                } )
            } ).then( () => {
            }, val => {
                if ( val === STATIC_VALUE ) {
                    done()
                }
            } )
        } )

        it( 'Promise.resolve', done => {
            Promise.resolve().then( done )
        } )

        it( 'Promise.reject', done => {
            Promise.reject().then( () => {
            }, done )
        } )

        it( 'catch error', done => {
            new Promise( () => {
                throw Error( 'error' )
            } ).catch( function () {
                done()
            } )
        } )

        it( 'state cannot be changed once it was settled', done => {
            var promise = new Promise( ( resolve, reject ) => {
                fakeAsyncOperation( () => {
                    resolve( Math.PI )
                    reject( 0 )
                    resolve( Math.sqrt( -1 ) )
                } )
            } )
            promise.then( pi => {
                if ( pi === Math.PI ) {
                    done()
                }
            } )
        } )
    } )

    describe( 'nest Promise', () => {
        it( 'return a Promise in a then function', done => {
            Promise.resolve( 'success' )
                .then( () => {
                    return Promise.reject( 'fail' )
                } ).then( txt => {
                    console.log( txt )
                } )
                .catch( txt => {
                    if ( txt === 'fail' ) done()
                } )
        } )

        it( 'throw a exception', done => {
            Promise.resolve( 'success' )
                .then( () => {
                    throw new Error( 'error!' )
                } ).then( txt => {
                    console.log( txt )
                } )
                .catch( err => {
                    err && done()
                } )
        } )
    } )
} )
