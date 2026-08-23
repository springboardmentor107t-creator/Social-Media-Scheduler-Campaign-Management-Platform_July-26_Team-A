"""add_role_and_content

Revision ID: eedfaa81af68
Revises: 4d6f4a11d0d6
Create Date: 2026-07-30 00:14:53.729674

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'eedfaa81af68'
down_revision = '4d6f4a11d0d6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('contents',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('owner_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('body', sa.Text(), nullable=True),
    sa.Column('media_urls', sa.JSON(), nullable=True),
    sa.Column('content_type', sa.Enum('text', 'image', 'video', 'carousel', name='content_type'), server_default='text', nullable=False),
    sa.Column('status', sa.Enum('draft', 'pending_approval', 'approved', name='content_status'), server_default='draft', nullable=False),
    sa.Column('is_approved', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    
    user_role_enum = sa.Enum('admin', 'manager', 'user', name='user_role')
    user_role_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('users', sa.Column('role', sa.Enum('admin', 'manager', 'user', name='user_role'), server_default='user', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'role')
    op.drop_table('contents')
    
    # Explicitly drop the Postgres Enum type
    user_role_enum = sa.Enum('admin', 'manager', 'user', name='user_role')
    user_role_enum.drop(op.get_bind(), checkfirst=True)

    content_type_enum = sa.Enum('text', 'image', 'video', 'carousel', name='content_type')
    content_type_enum.drop(op.get_bind(), checkfirst=True)

    content_status_enum = sa.Enum('draft', 'pending_approval', 'approved', name='content_status')
    content_status_enum.drop(op.get_bind(), checkfirst=True)
