# # api/db_routers.py

# class Munim006Router:
#     """
#     A router to control all database operations on models from the 'api' app
#     that are intended for the 'munim006_db' external database.
#     """
#     # List of models (by name, lowercase) that live in 'munim006_db'
#     munim006_models = [
#         'accountmaster',
#         'salesinvoice',
#         'itemmaster',
#         'salesinvoicedetails',
#         'salesinvoicebatchdetails',
#     ]
#     # The app label where these models are defined
#     route_app_label = 'api'

#     def db_for_read(self, model, **hints):
#         """
#         Attempts to read models from the munim006_models list go to 'munim006_db'.
#         All other models (e.g., Company, Dealer, Employee, MachineInstallation) go to 'default'.
#         """
#         if model._meta.app_label == self.route_app_label and model._meta.model_name in self.munim006_models:
#             return 'munim006_db'
#         return None # Return None to fall back to the next router or 'default' if no other routers

#     def db_for_write(self, model, **hints):
#         """
#         Attempts to write to models from the munim006_models list go to 'munim006_db'.
#         For managed=False models, Django typically doesn't perform ORM writes.
#         Direct writes to these models should be handled via raw SQL or specific methods.
#         If a write operation is attempted, it will be routed to 'munim006_db'.
#         """
#         if model._meta.app_label == self.route_app_label and model._meta.model_name in self.munim006_models:
#             return 'munim006_db'
#         return None # Return None to fall back to the next router or 'default' if no other routers

#     def allow_relation(self, obj1, obj2, **hints):
#         """
#         Allow relations between objects if they are in the same database.
#         Disallow relations between objects in different databases unless explicitly handled.
#         """
#         # Determine the database for each object's model
#         db_obj1 = self.db_for_read(obj1.__class__)
#         db_obj2 = self.db_for_read(obj2.__class__)

#         # If both objects are from models explicitly routed to munim006_db
#         if db_obj1 == 'munim006_db' and db_obj2 == 'munim006_db':
#             return True
#         # If both objects are from models not explicitly routed to munim006_db (i.e., 'default')
#         if db_obj1 is None and db_obj2 is None:
#             return True

#         # Disallow relations between models in different databases (e.g., 'default' and 'munim006_db')
#         return False

#     def allow_migrate(self, db, app_label, model_name=None, **hints):
#         """
#         Make sure the models specified in `munim006_models` only appear
#         in the 'munim006_db' database for migrations.
#         All other models (your primary Django app models) should only
#         be migrated in the 'default' database.
#         """
#         if app_label == self.route_app_label and model_name in self.munim006_models:
#             # These models should ONLY be handled by the 'munim006_db' for migration
#             return db == 'munim006_db'
#         else:
#             # All other models (your Company, Dealer, Employee, MachineInstallation, etc.)
#             # should ONLY be handled by the 'default' database for migration
#             return db == 'default'
# your_app/db_router.py
class Munim006Router:
    def db_for_read(self, model, **hints):
        if model._meta.db_table == 'SalesInvoice':
            return 'munim006_db'
        return None

    def db_for_write(self, model, **hints):
        if model._meta.db_table == 'SalesInvoice':
            return 'munim006_db'
        return None

class Munim008Router:
    """
    ItemMaster → ONLY READ from munim008_db
    Everything else → default DB
    """

    def db_for_read(self, model, **hints):
        if model._meta.model_name == 'itemmaster':
            return 'munim008_db'
        return 'default'

    def db_for_write(self, model, **hints):
        # ❌ NEVER allow write to munim008_db
        if model._meta.model_name == 'itemmaster':
            return None  # Django won't write, and model.save already blocked
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        # ✅ Only allow relation inside same DB
        if obj1._state.db and obj2._state.db:
            return obj1._state.db == obj2._state.db
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # ❌ No migrations for ItemMaster in default
        if model_name == 'itemmaster':
            return db == 'munim008_db'
        return db == 'default'
